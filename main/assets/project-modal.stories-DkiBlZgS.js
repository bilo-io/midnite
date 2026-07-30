import{aX as n,ay as R}from"./iframe-Ndp7Z41n.js";import{c as N,q as B,k as x,p as j}from"./fixtures-BZzR_DAR.js";import{C as P}from"./confirm-dialog-B9cSWN2v.js";import{P as H}from"./project-modal-rxX-BwlN.js";import"./preload-helper-Dp1pzeXC.js";import"./index-BvhSjJmi.js";import"./Select-ef7c0426.esm-BOuFyUvH.js";import"./chevron-down-BrtTEcXN.js";import"./check-Beq0GxkD.js";import"./index-CRVaz7o8.js";import"./triangle-alert-DSTl3iqW.js";import"./export-menu-BnWP9u1y.js";import"./client-u3r2EJPd.js";import"./markdown-preview-BPdJcnJN.js";import"./index.dom-D_wTd2ti.js";import"./file-text-DZNkotun.js";import"./copy-RbderPvR.js";import"./file-code-corner-BLW4QfW1.js";import"./loader-circle-BwhD6OY3.js";import"./api-DWLhwH10.js";import"./folder-open-CsOSCAy9.js";import"./folder-Bo4fDsDk.js";import"./tag-color-picker-Ytds410o.js";import"./project-tag-mSFq3JN3.js";import"./sparkles-uYXmJ_aW.js";import"./brain-C1qI-g0c.js";import"./chevron-right-CR3LWOQy.js";import"./markdown-editor-DJf5FC8M.js";import"./pencil-Yrxpvgzl.js";import"./trash-2-BO4UVOpE.js";import"./templates-Da031t7k.js";import"./plus-u32g_-1W.js";import"./task-row-DrZJC0aA.js";import"./i18n-labels-DaO6AUvz.js";import"./selectable-icon-CFwB_qsQ.js";import"./hover-expand-button-DqTLpJ9R.js";import"./index-UcOX2ZB7.js";import"./data-refresh-Czrgs2Vd.js";import"./rotate-ccw-DLvyg66r.js";import"./play-CrqB-JSx.js";import"./square-terminal-DdpGVVec.js";import"./task-columns-BUR8DOSo.js";var s,c,p,l,m,d,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:t}=__STORYBOOK_MODULE_TEST__,ja={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>n.jsx(R,{children:n.jsx(P,{children:n.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},i={args:{project:j,tasks:[B,x],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},r={args:{project:j,tasks:[B,x]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),S=t(e).getByRole("tab",{name:/plan/i});await C.click(S),await f(S).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
  args: {
    project: null
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', {
      name: 'New project'
    });
    await expect(within(dialog).getByLabelText('Title')).toHaveValue('');
  }
}`,...(p=o.parameters)===null||p===void 0||(c=p.docs)===null||c===void 0?void 0:c.source},description:{story:"Creating a project — empty form under the Details tab.",...(m=o.parameters)===null||m===void 0||(l=m.docs)===null||l===void 0?void 0:l.description}}};i.parameters={...i.parameters,docs:{...(d=i.parameters)===null||d===void 0?void 0:d.docs,source:{originalSource:`{
  args: {
    project,
    tasks: [taskFeature, taskBug],
    memories: [memoryProjectScoped],
    onSelectTask: fn()
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', {
      name: 'Edit project'
    });
    await expect(within(dialog).getByLabelText('Title')).toHaveValue(project.name);
  }
}`,...(u=i.parameters)===null||u===void 0||(v=u.docs)===null||v===void 0?void 0:v.source},description:{story:"Editing a project — fields pre-filled, with tasks + a scoped memory surfaced.",...(w=i.parameters)===null||w===void 0||(_=w.docs)===null||_===void 0?void 0:_.description}}};r.parameters={...r.parameters,docs:{...(g=r.parameters)===null||g===void 0?void 0:g.docs,source:{originalSource:`{
  args: {
    project,
    tasks: [taskFeature, taskBug]
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', {
      name: 'Edit project'
    });
    const planTab = within(dialog).getByRole('tab', {
      name: /plan/i
    });
    await userEvent.click(planTab);
    await expect(planTab).toHaveAttribute('aria-selected', 'true');
  }
}`,...(T=r.parameters)===null||T===void 0||(y=T.docs)===null||y===void 0?void 0:y.source},description:{story:"The tablist switches sections; selecting Plan marks that tab selected.",...(b=r.parameters)===null||b===void 0||(E=b.docs)===null||E===void 0?void 0:E.description}}};const ha=["New","Edit","SwitchTab"];export{i as Edit,o as New,r as SwitchTab,ha as __namedExportsOrder,ja as default};
